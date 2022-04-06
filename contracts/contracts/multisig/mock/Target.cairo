%lang starknet

## A mock target contract for testing multisig functionality

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.starknet.common.syscalls import get_tx_signature
from starkware.cairo.common.math import unsigned_div_rem
from starkware.cairo.common.alloc import alloc
from multisig.util import almost_equal as aeq

# Define a storage variable.
@storage_var
func balance() -> (res : felt):
end

@storage_var
func arraysum() -> (res : felt):
end

struct Something:
    member first : felt
    member second : felt
end

@constructor
func constructor{
    syscall_ptr : felt*,
    pedersen_ptr : HashBuiltin*,
    range_check_ptr
} ():
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

@external
func set_balance{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*,
        range_check_ptr}(_balance : felt):
    balance.write(_balance)
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

@view
func getArraySum{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*,
    range_check_ptr}() -> (res : felt):

    alloc_locals
    let (sum) = arraysum.read()

    return (sum)
end

@external 
func complex_inputs{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*,
        range_check_ptr}(a_len : felt, a : felt*, b_len, b: Something*) -> ():
    alloc_locals
    let (sum) = sum_array(a_len, a)
    let (sum2) = sum_array_structure(b_len, b)
    let total = sum + sum2.first + sum2.second
    arraysum.write(total)
    return ()
end

@view
func sum_array{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*,
        range_check_ptr}(
        a_len : felt, a : felt*) -> (res):
    if a_len == 0:
        return (res=0)
    end
    let (rest) = sum_array(a_len=a_len - 1, a=a + 1)
    return (res=a[0] + rest)
end

@view
func sum_array_structure{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*,
        range_check_ptr}(
        a_len : felt, a : Something*) -> (res : Something):
    if a_len == 0:
        return (res = Something(first = 0, second = 0))
    end
    let (rest) = sum_array_structure(a_len=a_len - 1, a=&a[1])
    return (res = Something(first = rest.first + a[0].first, second = rest.second + a[0].second ))
end