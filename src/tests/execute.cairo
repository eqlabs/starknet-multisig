use starsign::multisig::Multisig;
use starsign::multisig::IMultisigDispatcher;
use starsign::multisig::IMultisigDispatcherTrait;
use starsign::target::Target;
use starsign::target::ITargetDispatcher;
use starsign::target::ITargetDispatcherTrait;

use starknet::syscalls::deploy_syscall;
use starknet::ContractAddress;
use starknet::contract_address_const;
use starknet::testing::set_caller_address;
use starknet::class_hash::Felt252TryIntoClassHash;
use starknet::get_caller_address;
use starknet::call_contract_syscall;

use integer::u32_try_from_felt252;
//use starknet::hash;

use traits::Into;
use traits::TryInto;
use serde::Serde;
use array::ArrayTrait;
use option::OptionTrait;
use result::ResultTrait;

use debug::PrintTrait;

fn sample_calldata() -> Array::<felt252> {
    
    let mut calldata = ArrayTrait::new();
    calldata.append(1);
    calldata.append(2);
    calldata.append(3);
    calldata
}


fn get_multisig() -> (IMultisigDispatcher, ITargetDispatcher, ContractAddress) {
    let signer1 = contract_address_const::<10>();    

    let mut signers = ArrayTrait::<felt252>::new();
    let mut calldata = ArrayTrait::<felt252>::new(); 

    signers.append(signer1.into());
    signers.serialize(ref calldata);

    calldata.append(1_felt252); // threshold

    let (targetAddr, _) = deploy_syscall(Target::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();
    let (multisigAddr, _)  = deploy_syscall(Multisig::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();

   // let targ : ITargetDispatcher = ITargetDispatcher{ contract_address: targetAddr };
   // targ.increase_balance(6_felt252);

    (IMultisigDispatcher{ contract_address: multisigAddr }, ITargetDispatcher{ contract_address: targetAddr }, signer1)
}

#[test]
#[available_gas(2000000)]
fn test_execute_transaction() {
    let (multisig, target, signer1) = get_multisig();

    let mut calldata = ArrayTrait::<felt252>::new(); 
    let balanceIncrease = 123_felt252;
    calldata.append(balanceIncrease);

    let function_selector : felt252 = 1530486729947006463063166157847785599120665941190480211966374137237989315360; // increase_balance
    //let function_selector : felt252 = 719168919277503865715616387323460779478755286155257338662333893870409807111; // increase_one
    
    //let function_selector : felt252 = 'increase_balance';
     

    let mut serializedCalldata = ArrayTrait::<felt252>::new(); 
    calldata.serialize(ref serializedCalldata);

    multisig.submit_transaction(to: target.contract_address, function_selector: function_selector, function_calldata: serializedCalldata, nonce: 0);

    let oldBalance = target.get_balance();

    multisig.execute_transaction(0_u128);

    let newBalance = target.get_balance();

newBalance.print();
//let newu32 = u32_try_from_felt252(oldBalance).unwrap();
//let oldu32 = u32_try_from_felt252(newBalance).unwrap();


let incu32 = u32_try_from_felt252(balanceIncrease);
//let aaa : u32 = 
//(u32_try_from_felt252(newBalance).unwrap() + 5_u32).print();

//    assert((u32_try_from_felt252(oldBalance).unwrap()) + (u32_try_from_felt252(balanceIncrease).unwrap()) == u32_try_from_felt252(newBalance).unwrap(), 'hmm');

    //newBalance.print();

    //target.contract_address.print();

    // let response = call_contract_syscall(
    //         target.contract_address, function_selector, calldata.span()
    //     );
}

// #[test]
// #[available_gas(2000000)]
// #[should_panic]
// fn test_execute_confirmation_below_threshold() {
//     let signer1 = contract_address_const::<1>();
//     let signer2 = contract_address_const::<2>();
//     let mut signers = ArrayTrait::new();
//     signers.append(signer1);
//     signers.append(signer2);
//     Multisig::constructor(:signers, threshold: 2);
//     set_caller_address(signer1);
//     Multisig::submit_transaction(
//         to: contract_address_const::<42>(),
//         function_selector: 10,
//         calldata: sample_calldata(),
//         nonce: 0
//     );
//     Multisig::confirm_transaction(nonce: 0);
//     Multisig::execute_transaction(nonce: 0);
// }