# Declare this file as a StarkNet contract and set the required
# builtins.
%lang starknet
%builtins pedersen range_check

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.starknet.common.syscalls import get_tx_signature
from starkware.cairo.common.math import unsigned_div_rem
from starkware.cairo.common.alloc import alloc
from util import almost_equal as aeq

# Define a storage variable.
@storage_var
func balance() -> (res : felt):
end

@constructor
func constructor{
    syscall_ptr : felt*,
    pedersen_ptr : HashBuiltin*,
    range_check_ptr
} (initial_balance : felt):
    balance.write(initial_balance)
    return ()
end

# Increases the balance by the given amount.
@external
func increase_balance{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*,
        range_check_ptr}(amount1 : felt):
    let (res) = balance.read()
    balance.write(res + amount1)
    return ()
end

@view
func increase_balance_with_even{
    syscall_ptr: felt*, pedersen_ptr: HashBuiltin*,
    range_check_ptr}(amount: felt):

    let (div, rem) = unsigned_div_rem(amount, 2)
    assert rem = 0 # assert even
    let (res) = balance.read()
    balance.write(res + amount)
    return ()
end

# Returns the current balance.
@view
func get_balance{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*,
        range_check_ptr}() -> (res : felt):
    let (res) = balance.read()
    return (res)
end
