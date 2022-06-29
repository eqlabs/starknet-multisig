from starkware.cairo.common.default_dict import default_dict_new, default_dict_finalize
from starkware.cairo.common.dict import dict_update
from starkware.cairo.common.dict_access import DictAccess

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

    # Squashe the dictionary and verify consistency with respect to the default value
    # https://www.cairo-lang.org/docs/reference/common_library.html#common-library-default-dict
    default_dict_finalize(my_dict_start, my_dict_end, data_len)

    return ()
end
