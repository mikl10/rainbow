import { useAccountSettings } from '@/hooks';
import { userAssetsStore } from '@/state/assets/userAssets';
import { useSwapsStore } from '@/state/swaps/swapsStore';
import { selectUserAssetsList, selectorFilterByUserChains } from '@/resources/assets/_selectors/assets';
import { ParsedSearchAsset } from '@/components/swaps/types/assets';
import { useUserAssets } from '@/resources/assets';
import { ChainId } from '@/chains/types';

export const UserAssetsSync = function UserAssetsSync() {
  const { accountAddress, nativeCurrency: currentCurrency } = useAccountSettings();

  const isSwapsOpen = useSwapsStore(state => state.isSwapsOpen);

  useUserAssets(
    {
      address: accountAddress,
      currency: currentCurrency,
    },
    {
      enabled: !isSwapsOpen,
      select: data =>
        selectorFilterByUserChains({
          data,
          selector: selectUserAssetsList,
        }),
      onSuccess: data => {
        if (!isSwapsOpen) {
          userAssetsStore.getState().setUserAssets(data as ParsedSearchAsset[]);

          const inputAsset = userAssetsStore.getState().getHighestValueEth();
          useSwapsStore.setState({
            inputAsset,
            selectedOutputChainId: inputAsset?.chainId ?? ChainId.mainnet,
          });
        }
      },
    }
  );

  return null;
};
