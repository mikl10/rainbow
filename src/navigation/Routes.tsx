import React from 'react';
// eslint-disable-next-line import/no-unresolved
import OldRoutes from './OldRoutes';
import RouteNames from './routesNames';
import { createBottomSheetNavigator } from './bottom-sheet-navigator/createBottomSheetNavigator';
import ExplainSheet from '@/screens/ExplainSheet';
import ExpandedAssetSheet from '@/screens/ExpandedAssetSheet';
import SendSheet from '@/screens/SendSheet';
import { AddCashSheet } from '@/screens/AddCash';
import AddTokenSheet from '@/screens/AddTokenSheet';
import BackupSheet from '@/screens/BackupSheet';
import ChangeWalletSheet from '@/screens/ChangeWalletSheet';
import { AddWalletNavigator } from './AddWalletNavigator';
import ModalScreen from '@/screens/ModalScreen';

const BottomSheet = createBottomSheetNavigator();

export function Routes() {
  return (
    <BottomSheet.Navigator>
      <BottomSheet.Screen
        options={{ root: true }}
        component={OldRoutes}
        name={RouteNames.ROOT_STACK}
      />
      <BottomSheet.Screen
        component={ExpandedAssetSheet}
        name={RouteNames.EXPANDED_ASSET_SHEET}
      />
      <BottomSheet.Screen
        component={ExpandedAssetSheet}
        name={RouteNames.SWAP_DETAILS_SHEET}
      />
      <BottomSheet.Screen
        component={ExpandedAssetSheet}
        name={RouteNames.TOKEN_INDEX_SHEET}
      />
      <BottomSheet.Screen
        component={ExpandedAssetSheet}
        name={RouteNames.EXPANDED_ASSET_SHEET_POOLS}
      />
      <BottomSheet.Screen
        component={ExplainSheet}
        name={RouteNames.EXPLAIN_SHEET}
      />
      <BottomSheet.Screen component={SendSheet} name={RouteNames.SEND_SHEET} />
      <BottomSheet.Screen
        component={AddCashSheet}
        name={RouteNames.ADD_CASH_SHEET}
      />
      <BottomSheet.Screen
        component={AddTokenSheet}
        name={RouteNames.ADD_TOKEN_SHEET}
      />
      <BottomSheet.Screen
        component={BackupSheet}
        name={RouteNames.BACKUP_SHEET}
      />
      <BottomSheet.Screen
        component={ChangeWalletSheet}
        name={RouteNames.CHANGE_WALLET_SHEET}
      />
      <BottomSheet.Screen
        component={AddWalletNavigator}
        name={RouteNames.ADD_WALLET_NAVIGATOR}
      />
      <BottomSheet.Screen
        component={ModalScreen}
        name={RouteNames.MODAL_SCREEN}
      />
    </BottomSheet.Navigator>
  );
}
