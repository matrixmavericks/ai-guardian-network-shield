import { useLocation } from 'react-router-dom';

/**
 * Returns true if the current route is inside a school subdomain path (/s/:subdomain/...).
 * This is used to conditionally hide the main DashboardSidebar when the SchoolSidebar is already rendered.
 */
export const useSchoolCheck = (): boolean => {
  const location = useLocation();
  return location.pathname.startsWith('/s/');
};
