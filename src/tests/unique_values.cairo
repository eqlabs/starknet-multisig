use starsign::multisig::assert_unique_values;
use starsign::multisig::Multisig;

use array::ArrayTrait;

#[test]
#[available_gas(2000000)]
fn test_assert_unique_values_empty() {
    let mut a = ArrayTrait::<felt252>::new();
    assert_unique_values(@a);
}

#[test]
#[available_gas(2000000)]
fn test_assert_unique_values_no_duplicates() {
    let mut a = ArrayTrait::new();
    a.append(1);
    a.append(2);
    a.append(3);
    assert_unique_values(@a);
}

#[test]
#[available_gas(2000000)]
#[should_panic(expected: ('duplicate values',))]
fn test_assert_unique_values_with_duplicate() {
    let mut a = ArrayTrait::new();
    a.append(1);
    a.append(2);
    a.append(3);
    a.append(3);
    assert_unique_values(@a);
}