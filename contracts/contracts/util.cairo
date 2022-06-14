from starkware.cairo.common.math import assert_not_zero
from starkware.cairo.common.default_dict import default_dict_new, default_dict_finalize
from starkware.cairo.common.dict import dict_update
from starkware.cairo.common.dict_access import DictAccess

func almost_equal(a, b) -> (res : felt):
    if (a - b) * (a - b - 1) * (a - b + 1) == 0:
        return (res=1)
    end
    return (res=0)
end

func assert_unique_elements_impl{range_check_ptr, dict_ptr : DictAccess*}(
    index : felt, data_len : felt, data : felt*
):
    alloc_locals
    if index == data_len:
        return ()
    end

    # Fails if some key's value was set
    dict_update(key=[data], prev_value=data_len, new_value=index)

    return assert_unique_elements_impl(index + 1, data_len, data + 1)
end

func assert_unique_elements{range_check_ptr}(data_len : felt, data : felt*):
    alloc_locals

    # default_value shall be not less than data_len
    # otherwise data[default_value] can have duplicates for index in (default_value, data_len)
    let (local my_dict_start) = default_dict_new(default_value=data_len)
    let my_dict_end = my_dict_start

    assert_unique_elements_impl{range_check_ptr=range_check_ptr, dict_ptr=my_dict_end}(
        index=0, data_len=data_len, data=data
    )

    let (finalized_dict_start, finalized_dict_end) = default_dict_finalize(
        my_dict_start, my_dict_end, data_len
    )

    return ()
end
