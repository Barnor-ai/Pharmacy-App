-- ==============================================================================
-- PHASE 5C: ATOMIC POS CHECKOUT TRANSACTION RPC
-- Function: public.complete_sale_transaction
-- Description: Executes atomic checkout with row-level stock locking,
--              tenant authorization, sales insertion, line-item insertion,
--              and atomic quantity deduction.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.complete_sale_transaction(
  p_items JSONB,
  p_customer_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'Cash'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_sale_id UUID;
  v_total_amount NUMERIC(12, 2) := 0.00;
  v_item JSONB;
  v_med_id UUID;
  v_med_qty INTEGER;
  v_med_unit_price NUMERIC(12, 2);
  v_med_subtotal NUMERIC(12, 2);
  v_current_stock INTEGER;
  v_med_name TEXT;
  v_med_generic TEXT;
  v_med_barcode TEXT;
  v_invoice_no TEXT;
  v_sale_count BIGINT;
  v_item_count INTEGER := 0;
  v_result_items JSONB := '[]'::jsonb;
  v_cust_name TEXT := 'Walk-in Customer';
  v_cust_phone TEXT := '';
BEGIN
  -- 1. Resolve authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: User is not authenticated';
  END IF;

  -- 2. Resolve user's organization_id (Tenant resolution)
  v_org_id := public.get_my_organization_id();
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id
    FROM public.organizations
    WHERE owner_id = v_user_id
    LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User does not belong to any active organization';
  END IF;

  -- 3. Verify user has sales.create permission (or is owner)
  IF NOT (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = v_org_id AND owner_id = v_user_id)
    OR public.has_permission('sales.create')
  ) THEN
    RAISE EXCEPTION 'Permission denied: User lacks permission to process sales';
  END IF;

  -- 4. Validate customer if provided
  IF p_customer_id IS NOT NULL THEN
    SELECT name, COALESCE(phone, '') INTO v_cust_name, v_cust_phone
    FROM public.customers
    WHERE id = p_customer_id AND organization_id = v_org_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid customer: Customer does not belong to your organization';
    END IF;
  END IF;

  -- 5. Validate items array
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty: At least one item is required to complete a sale';
  END IF;

  -- 6. Lock and validate all medicine rows (prevent concurrent race conditions)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_med_id := (v_item->>'medicine_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid medicine identifier format';
    END;

    v_med_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);

    IF v_med_id IS NULL THEN
      RAISE EXCEPTION 'Invalid line item: medicine_id is required';
    END IF;

    IF v_med_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity: Requested quantity must be greater than zero';
    END IF;

    -- Explicit Row-Level Lock FOR UPDATE on tenant medicines
    SELECT name, quantity, selling_price
    INTO v_med_name, v_current_stock, v_med_unit_price
    FROM public.medicines
    WHERE id = v_med_id AND organization_id = v_org_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Medicine not found or does not belong to your organization (ID: %)', v_med_id;
    END IF;

    -- Strict Stock Verification
    IF v_current_stock < v_med_qty THEN
      RAISE EXCEPTION 'Insufficient stock for %. Available: %, Requested: %.', v_med_name, v_current_stock, v_med_qty;
    END IF;

    -- Calculate unit price and subtotal
    IF (v_item ? 'unit_price') AND (v_item->>'unit_price')::NUMERIC >= 0 THEN
      v_med_unit_price := (v_item->>'unit_price')::NUMERIC;
    END IF;

    v_med_subtotal := ROUND((v_med_unit_price * v_med_qty)::NUMERIC, 2);
    v_total_amount := v_total_amount + v_med_subtotal;
    v_item_count := v_item_count + 1;
  END LOOP;

  -- 7. Generate invoice number
  SELECT COUNT(*) + 1 INTO v_sale_count
  FROM public.sales
  WHERE organization_id = v_org_id;

  v_invoice_no := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_sale_count::TEXT, 5, '0');

  -- 8. Insert parent sales record
  INSERT INTO public.sales (
    organization_id,
    customer_id,
    sold_by,
    total_amount,
    payment_method,
    created_at
  )
  VALUES (
    v_org_id,
    p_customer_id,
    v_user_id,
    v_total_amount,
    COALESCE(NULLIF(p_payment_method, ''), 'Cash'),
    NOW()
  )
  RETURNING id INTO v_sale_id;

  -- 9. Insert sale_items, deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_med_id := (v_item->>'medicine_id')::UUID;
    v_med_qty := (v_item->>'quantity')::INTEGER;

    SELECT name, generic_name, barcode, selling_price
    INTO v_med_name, v_med_generic, v_med_barcode, v_med_unit_price
    FROM public.medicines
    WHERE id = v_med_id;

    IF (v_item ? 'unit_price') AND (v_item->>'unit_price')::NUMERIC >= 0 THEN
      v_med_unit_price := (v_item->>'unit_price')::NUMERIC;
    END IF;

    v_med_subtotal := ROUND((v_med_unit_price * v_med_qty)::NUMERIC, 2);

    -- Insert sale line item
    INSERT INTO public.sale_items (
      sale_id,
      medicine_id,
      quantity,
      unit_price,
      subtotal
    )
    VALUES (
      v_sale_id,
      v_med_id,
      v_med_qty,
      v_med_unit_price,
      v_med_subtotal
    );

    -- Atomic Stock Deduction
    UPDATE public.medicines
    SET quantity = quantity - v_med_qty
    WHERE id = v_med_id AND organization_id = v_org_id;

    -- Build return items payload
    v_result_items := v_result_items || jsonb_build_object(
      'medicine_id', v_med_id,
      'name', v_med_name,
      'generic_name', COALESCE(v_med_generic, ''),
      'barcode', COALESCE(v_med_barcode, ''),
      'quantity', v_med_qty,
      'unit_price', v_med_unit_price,
      'subtotal', v_med_subtotal
    );
  END LOOP;

  -- 10. Return complete sale object for POS receipt / PDF / State update
  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'invoice_no', v_invoice_no,
    'customer_id', p_customer_id,
    'customer_name', v_cust_name,
    'customer_phone', v_cust_phone,
    'total_amount', v_total_amount,
    'payment_method', COALESCE(NULLIF(p_payment_method, ''), 'Cash'),
    'created_at', NOW(),
    'items_count', v_item_count,
    'items', v_result_items
  );
END;
$$;
