import { makeMutable, SharedValue } from 'react-native-reanimated';
import Routes from '@/navigation/routesNames';
import { createRainbowStore } from '../internal/createRainbowStore';
import { POINTS_ROUTES } from '@/screens/points/PointsScreen';

const SWIPE_ROUTES = [
  Routes.WALLET_SCREEN,
  Routes.DISCOVER_SCREEN,
  Routes.DAPP_BROWSER_SCREEN,
  Routes.PROFILE_SCREEN,
  Routes.POINTS_SCREEN,
  POINTS_ROUTES['CLAIM_CONTENT'],
  POINTS_ROUTES['REFERRAL_CONTENT'],
];

type SwipeRoute = (typeof SWIPE_ROUTES)[number];

const isSwipeRoute = (route: string): route is SwipeRoute => {
  return Object.values(SWIPE_ROUTES).includes(route as SwipeRoute);
};

interface FreezeStore {
  activeRoute: string;
  activeSwipeRoute: SwipeRoute;
  animatedActiveRoute: SharedValue<string>;
  animatedActiveSwipeRoute: SharedValue<SwipeRoute>;
  setActiveRoute: (route: string) => void;
}

export const useFreezeStore = createRainbowStore<FreezeStore>(set => ({
  activeRoute: Routes.WALLET_SCREEN,
  activeSwipeRoute: Routes.WALLET_SCREEN,
  animatedActiveRoute: makeMutable<string>(Routes.WALLET_SCREEN),
  animatedActiveSwipeRoute: makeMutable<SwipeRoute>(Routes.WALLET_SCREEN),

  setActiveRoute: (route: string) => {
    set(state => {
      const onSwipeRoute = isSwipeRoute(route);

      state.animatedActiveRoute.value = route;
      if (onSwipeRoute) state.animatedActiveSwipeRoute.value = route;

      return {
        ...state,
        activeRoute: route,
        activeSwipeRoute: onSwipeRoute ? route : state.activeSwipeRoute,
      };
    });
  },
}));
