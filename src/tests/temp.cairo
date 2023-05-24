

use starknet::syscalls::deploy_syscall;
use starknet::ContractAddress;
use starknet::contract_address_const;
use starknet::testing::set_caller_address;
use starknet::class_hash::Felt252TryIntoClassHash;
use starknet::get_caller_address;
use starknet::call_contract_syscall;

use integer::u32_try_from_felt252;

use traits::Into;
use traits::TryInto;
use serde::Serde;
use array::ArrayTrait;
use option::OptionTrait;
use result::ResultTrait;

use debug::PrintTrait;

 #[test]
 #[available_gas(2000000)]
 fn test_temp() {
    let mut myarr = ArrayTrait::<felt252>::new(); 
    let myvar = 123_felt252;
    myarr.append(myvar);
    let mut serializedArr = ArrayTrait::<felt252>::new(); 
    myarr.serialize(ref serializedArr);
    let incu32 = u32_try_from_felt252(myvar);
 }