import { ChainId } from '@/state/backendNetworks/types';

export const gasUnits = {
  basic_approval: '55000',
  basic_deposit: '420000',
  basic_deposit_eth: '200000',
  basic_swap: {
    [ChainId.mainnet]: '200000',
    [ChainId.arbitrum]: '350000',
    [ChainId.optimism]: '350000',
    [ChainId.base]: '350000',
    [ChainId.zora]: '1000000',
    [ChainId.bsc]: '600000',
    [ChainId.polygon]: '600000',
    [ChainId.avalanche]: '350000',
    [ChainId.degen]: '350000',
    [ChainId.blast]: '300000',
  },
  basic_swap_permit: '400000',
  ens_register_with_config: '280000',
  ens_commit: '50000',
  ens_set_text: '60000',
  ens_set_name: '60000',
  ens_set_multicall: '270000',
  ens_registration: '600000',
  basic_tx: '21000',
  basic_withdrawal: '550000',
  basic_transfer: '50000',
  arbitrum_basic_tx: '735000',
  default_l1_gas_fee_optimism_swap: '0001064760511747',
  weth_wrap: '30000',
  weth_unwrap: '40000',
  noether: '0',
};
