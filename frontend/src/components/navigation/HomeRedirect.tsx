import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { isMedicalAppMode } from '../../config/appMode';
import { getMedicalHubPath, resolvePostLoginPath } from '../../utils/medicalNavigation';

const HomeRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeFacilityId, isBootstrapping, getMemberships } = useAuth();

  useEffect(() => {
    if (isBootstrapping) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const memberships = getMemberships ? getMemberships() : [];
    const activeMembership = activeFacilityId
      ? memberships.find((m) => m.facility_id === activeFacilityId && m.is_active)
      : undefined;

    if (!activeFacilityId && memberships.length > 0) {
      navigate('/select-facility', { replace: true });
      return;
    }

    if (activeFacilityId) {
      if (isMedicalAppMode()) {
        navigate(getMedicalHubPath(activeFacilityId), { replace: true });
        return;
      }

      const path = resolvePostLoginPath({
        activeFacilityId,
        membershipRole: activeMembership?.role,
        isPlatformAdmin: user.is_platform_admin,
        hasMemberships: memberships.length > 0,
      });
      navigate(path, { replace: true });
      return;
    }

    if (user.is_platform_admin && !isMedicalAppMode()) {
      navigate('/platform', { replace: true });
    }
  }, [user, activeFacilityId, isBootstrapping, getMemberships, navigate]);

  return <LoadingSpinner fullScreen />;
};

export default HomeRedirect;
