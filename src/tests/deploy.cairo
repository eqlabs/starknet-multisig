use starknet::contract_address_const;
use starknet::testing::set_caller_address;
use starknet::class_hash::class_hash_const;
use starknet::syscalls::deploy_syscall;
use starknet::class_hash::Felt252TryIntoClassHash;
use starknet::ContractAddress;
use starknet::SyscallResult;

use serde::Serde;
use array::ArrayTrait;
use traits::Into;
use traits::TryInto;
use option::OptionTrait;
use result::ResultTrait;

use starsign::multisig::assert_unique_values;
use starsign::multisig::Multisig;

#[test]
#[available_gas(2000000)]
fn test_unique_deployment_addresses() {
    let signer1 = contract_address_const::<1>();
    let signer2 = contract_address_const::<2>();

    let mut signers = ArrayTrait::<felt252>::new();
    let mut calldata = ArrayTrait::<felt252>::new(); 

    signers.append(signer1.into());

    signers.serialize(ref calldata);

    calldata.append(1_felt252); // threshold

    let (addr1, _)  = deploy_syscall(Multisig::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();
    let (addr2, _)  = deploy_syscall(Multisig::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();

    assert(addr1 != addr2, 'Non-unique addresses');
}