%lang starknet
%builtins pedersen range_check

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.starknet.common.syscalls import call_contract, get_caller_address, get_tx_signature
from starkware.cairo.common.math import unsigned_div_rem
from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.registers import get_fp_and_pc

struct Message:
    member to: felt
    member selector: felt
    member calldata: felt
    member calldata_size: felt
    member nonce: felt
end

@storage_var
func balance() -> (res: felt):
end

@storage_var
func tx() -> (msg: Message):
end

@storage_var
func _transaction_calldata(tx_index : felt, calldata_index : felt) -> (res : felt):
end

@constructor
func constructor{
    syscall_ptr: felt*, 
    pedersen_ptr: HashBuiltin*, 
    range_check_ptr
}(initial_balance: felt):
    return ()
end

@external
func store{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(
        to: felt,
        selector: felt,
        calldata_len: felt,
        calldata: felt*,
        nonce: felt
    ) -> ():

    alloc_locals

    _set_transaction_calldata(
        tx_index=0,
        calldata_index=0,
        calldata_len=calldata_len,
        calldata=calldata,
    )

 
    return ()
end

func _set_transaction_calldata{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr,
    }(
        tx_index : felt,
        calldata_index : felt,
        calldata_len : felt,
        calldata : felt*,
    ):
    if calldata_index == calldata_len:
        return ()
    end

     # Write the current iteration to storage
    _transaction_calldata.write(
        tx_index=tx_index,
        calldata_index=calldata_index,
        value=[calldata],
    )

    # Recursively write the rest
    _set_transaction_calldata(
        tx_index=tx_index,
        calldata_index=calldata_index + 1,
        calldata_len=calldata_len,
        calldata=calldata + 1,
    )
    return ()
end


