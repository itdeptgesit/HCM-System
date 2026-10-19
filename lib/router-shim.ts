import React from 'react';
import {
  Link as RouterLink,
  Outlet as RouterOutlet,
  useLocation as useRouterLocation,
  useNavigate as useRouterNavigate,
} from 'react-router-dom';

export function Link({ to, children, className, ...props }: any) {
  return React.createElement(
    RouterLink,
    { to: to || '#', className, ...props },
    children
  );
}

export const Outlet = RouterOutlet;
export const useLocation = useRouterLocation;

export function useNavigate() {
  const nav = useRouterNavigate();
  return React.useCallback(
    (toOrOpts: any, options?: any) => {
      if (typeof toOrOpts === 'object' && toOrOpts?.to) {
        return nav(toOrOpts.to, options);
      }
      return nav(toOrOpts, options);
    },
    [nav]
  );
}

export const createFileRoute = (_path: string) => (config: any) => config;
export const createRootRoute = (config: any) => config;
export const notFound = () => null;
export const HeadContent = () => null;
export const Scripts = () => null;
