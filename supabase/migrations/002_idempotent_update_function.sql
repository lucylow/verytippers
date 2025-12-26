-- Idempotent tip confirmation update function
-- This function ensures that tip status updates are atomic and idempotent
-- Prevents duplicate confirmations and ensures status progression: pending -> submitted -> confirmed

create or replace function update_tip_confirmation(
  p_tip_id uuid,
  p_tx_hash text,
  p_confirmations int,
  p_status text
) returns jsonb as $$
declare
  v_current_status text;
  v_current_confirmations int;
  v_result jsonb;
begin
  -- Get current tip status
  select status, confirmations into v_current_status, v_current_confirmations
  from tips
  where id = p_tip_id;

  if not found then
    return jsonb_build_object('error', 'Tip not found');
  end if;

  -- Status progression: pending -> submitted -> confirmed
  -- Only allow progression forward, not backward
  if v_current_status = 'confirmed' and p_status = 'confirmed' then
    -- Already confirmed, just update confirmations if higher
    update tips
    set confirmations = greatest(confirmations, p_confirmations),
        relayer_tx_hash = coalesce(relayer_tx_hash, p_tx_hash)
    where id = p_tip_id;
    
    return jsonb_build_object('success', true, 'message', 'Already confirmed, updated confirmations');
  elsif v_current_status = 'pending' and p_status in ('submitted', 'confirmed') then
    -- Allow progression from pending
    update tips
    set status = p_status,
        relayer_tx_hash = p_tx_hash,
        confirmations = p_confirmations
    where id = p_tip_id;
    
    return jsonb_build_object('success', true, 'message', 'Status updated from pending');
  elsif v_current_status = 'submitted' and p_status = 'confirmed' then
    -- Allow progression from submitted to confirmed
    update tips
    set status = 'confirmed',
        confirmations = greatest(confirmations, p_confirmations)
    where id = p_tip_id;
    
    return jsonb_build_object('success', true, 'message', 'Status updated to confirmed');
  elsif v_current_status = p_status then
    -- Same status, just update confirmations and tx_hash if provided
    update tips
    set confirmations = greatest(confirmations, p_confirmations),
        relayer_tx_hash = coalesce(relayer_tx_hash, p_tx_hash)
    where id = p_tip_id;
    
    return jsonb_build_object('success', true, 'message', 'Confirmations updated');
  else
    -- Invalid status transition
    return jsonb_build_object(
      'error', 'Invalid status transition',
      'current_status', v_current_status,
      'requested_status', p_status
    );
  end if;
end;
$$ language plpgsql;

-- Grant execute permission to authenticated users (though typically only service role will use this)
grant execute on function update_tip_confirmation(uuid, text, int, text) to authenticated;
grant execute on function update_tip_confirmation(uuid, text, int, text) to service_role;

