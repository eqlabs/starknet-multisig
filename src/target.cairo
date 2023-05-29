use array::ArrayTrait;

#[abi]
trait ITarget {
    #[view]
    fn get_balance() -> felt252;

    #[view]
    fn get_arraySum() -> usize;

    #[external]
    fn increase_balance(amount: felt252);

    #[external]
    fn complex_inputs(first_some: Array<usize>, second_some: Array<Something>);
}

#[derive(Copy, Drop, Serde)]
struct Something {
    first: usize,
    second: usize
}

#[contract]
mod Target {
    use super::Something;
    use traits::Into;
    use traits::TryInto;
    use array::ArrayTrait;
    use option::OptionTrait;
    use serde::Serde;    

    use starknet::StorageAccess;
    use starknet::StorageBaseAddress;
    use starknet::SyscallResult;
    use starknet::storage_address_from_base_and_offset;
    use starknet::storage_read_syscall;
    use starknet::storage_write_syscall;

    struct Storage {
        balance : felt252,
        arraySum: usize
    }

    impl TransactionStorageAccess of StorageAccess<Something> {
        fn read(address_domain: u32, base: StorageBaseAddress) -> SyscallResult::<Something> {
            Result::Ok(
                Something {
                    first: storage_read_syscall(
                        address_domain, storage_address_from_base_and_offset(base, 0_u8)
                    )?.try_into().unwrap(),
                    second: storage_read_syscall(
                        address_domain, storage_address_from_base_and_offset(base, 1_u8)
                    )?.try_into().unwrap(),
                }
            )
        }

        fn write(
            address_domain: u32, base: StorageBaseAddress, value: Something
        ) -> SyscallResult::<()> {
            storage_write_syscall(
                address_domain, storage_address_from_base_and_offset(base, 0_u8), value.first.into(), 
            )?;
            storage_write_syscall(
                address_domain,
                storage_address_from_base_and_offset(base, 1_u8),
                value.second.into()
            )
        }
    }

    #[view]
    fn get_balance() -> felt252 {
        balance::read()
    }

    #[view]
    fn get_arraySum() -> usize {
        arraySum::read()
    }

    #[external]
    fn increase_balance(amount: felt252) {
        assert(amount != 0, 'Amount must be positive');
        let res = balance::read();
        balance::write(res + amount);
    }

    #[external]
    fn complex_inputs(first_some: Array<usize>, second_some: Array<Something>) {
        let mut i : usize = 0;
        let mut totalSum : usize = 0;
        loop {
            
            if (i == first_some.len()) {
                break ();
            }
            totalSum = totalSum + *first_some.at(i);
            i = i + 1_usize;
        };

        i = 0;
        loop {
            
            if (i == second_some.len()) {
                break ();
            }
            totalSum = totalSum + (*second_some.at(i)).first + (*second_some.at(i)).second;
            i = i + 1_usize;
        };
        arraySum::write(totalSum);
    }

    #[external]
    fn revertFunc() {
        let mut arr = ArrayTrait::<usize>::new();
        arr.at(10);
    }
}