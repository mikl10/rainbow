/*
 *   // Other tests to consider:
 *       - Flip assets
 *       - exchange button onPress
 *       - disable button states once https://github.com/rainbow-me/rainbow/pull/5785 gets merged
 *       - swap execution
 *       - token search (both from userAssets and output token list)
 *       - custom gas panel
 *       - flashbots
 *       - slippage
 *       - explainer sheets
 *       - switching wallets inside of swap screen
 */

import {
  importWalletFlow,
  sendETHtoTestWallet,
  checkIfVisible,
  beforeAllcleanApp,
  afterAllcleanApp,
  fetchElementAttributes,
  tap,
  delayTime,
  swipeUntilVisible,
  tapAndLongPress,
  swipe,
  tapByText,
  waitAndTap,
} from './helpers';

import { expect } from '@jest/globals';
import { WALLET_VARS } from './testVariables';

describe('Swap Sheet Interaction Flow', () => {
  beforeAll(async () => {
    await beforeAllcleanApp({ hardhat: true });
  });
  afterAll(async () => {
    await afterAllcleanApp({ hardhat: true });
  });

  it('Import a wallet and go to welcome', async () => {
    await importWalletFlow(WALLET_VARS.EMPTY_WALLET.PK);
  });

  it('Should send ETH to test wallet', async () => {
    // send 20 eth
    await sendETHtoTestWallet();
  });

  it('Should show Hardhat Toast after pressing Connect To Hardhat', async () => {
    await tap('dev-button-hardhat');
    await checkIfVisible('testnet-toast-Hardhat');

    // validate it has the expected funds of 20 eth
    const attributes = await fetchElementAttributes('fast-coin-info');
    expect(attributes.label).toContain('Ethereum');
    expect(attributes.label).toContain('20');
  });

  // Swaps entry point 1
  it('Should open swaps via wallet screen swap button with 50% inputAmount for inputAsset', async () => {
    await device.disableSynchronization();
    await tap('swap-button');
    await delayTime('long');

    const swapInput = await fetchElementAttributes('swap-asset-input');

    expect(swapInput.label).toContain('10');
    expect(swapInput.label).toContain('ETH');

    // dismiss swaps sheet
    await swipe('swap-screen', 'down', 'fast');
  });

  // Swaps entry point 2
  it('Should open swaps via asset chart with that asset selected with 50% inputAmount for inputAsset', async () => {
    await tap('balance-coin-row-Ethereum');
    await delayTime('medium');
    await tap('swap-action-button');
    await delayTime('long');
    const swapInput = await fetchElementAttributes('swap-asset-input');

    expect(swapInput.label).toContain('10');
    expect(swapInput.label).toContain('ETH');

    // dismiss swaps sheet
    await swipe('swap-screen', 'down', 'fast');

    // dismiss expanded asset sheet
    await swipe('expanded-asset-sheet', 'down', 'fast');
  });

  // Swaps entry point 3
  it('Should open swaps from browser control panel with 50% inputAmount for inputAsset', async () => {
    await tap('tab-bar-icon-DappBrowserScreen');
    await delayTime('long');
    await checkIfVisible('browser-screen');
    await tap('account-icon-button');
    await waitAndTap('control-panel-swap');

    await delayTime('long');
    const swapInput = await fetchElementAttributes('swap-asset-input');

    expect(swapInput.label).toContain('10');
    expect(swapInput.label).toContain('ETH');
  });

  // Execute swap
  it('Should be able to go to review and execute a swap', async () => {
    await delayTime('very-long');

    await swipeUntilVisible('token-to-buy-dai-1', 'token-to-buy-list', 'up', 100);
    await tap('token-to-buy-dai-1');
    await delayTime('medium');
    await tap('swap-bottom-action-button');
    const inputAssetActionButton = await fetchElementAttributes('swap-input-asset-action-button');
    const outputAssetActionButton = await fetchElementAttributes('swap-output-asset-action-button');
    const holdToSwapButton = await fetchElementAttributes('swap-bottom-action-button');

    expect(inputAssetActionButton.label).toBe('ETH 􀆏');
    expect(outputAssetActionButton.label).toBe('DAI 􀆏');
    expect(holdToSwapButton.label).toBe('􀎽 Hold to Swap');

    await tapAndLongPress('swap-bottom-action-button', 1500);
  });

  it('Should be able to verify swap is happening', async () => {
    await delayTime('very-long');
    await checkIfVisible('profile-screen');
    const activityListElements = await fetchElementAttributes('wallet-activity-list');
    expect(activityListElements.label).toContain('ETH');
    expect(activityListElements.label).toContain('DAI');
    await tapByText('Swapping');
    await delayTime('long');
    const transactionSheet = await checkIfVisible('transaction-details-sheet');
    expect(transactionSheet).toBeTruthy();
    // dismiss sheet
    await swipe('transaction-details-sheet', 'down', 'fast');
  });
});
