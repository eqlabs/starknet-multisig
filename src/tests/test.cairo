use starknet::contract_address_const;
use starknet::testing::set_caller_address;
use starknet::class_hash::class_hash_const;

use starknet::syscalls::deploy_syscall;
use starknet::class_hash::Felt252TryIntoClassHash;
use starknet::ContractAddress;
use starknet::SyscallResult;
use serde::Serde;

use array::ArrayTrait;
use starknet::testing;
use traits::Into;
use traits::TryInto;
use option::OptionTrait;
use result::ResultTrait;
use debug::PrintTrait;

use starsign::multisig::assert_unique_values;
use starsign::multisig::Multisig;

// TODO: test execute_confirmation happy path with mocked
// call_contract_syscall
// TODO: test set_threshold with recursive call
// TODO: test set_signers with recursive call
// TODO: test set_signers_and_thershold with recursive call

// #[test]
// #[available_gas(2000000)]
// #[should_panic(expected: ('only multisig allowed', ))]
// fn test_upgrade_not_multisig() {
//     let account = contract_address_const::<777>();
//     set_caller_address(account);

//     Multisig::upgrade(class_hash_const::<1>())
// }

