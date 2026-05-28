import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { isMedicalAppMode } from '../../config/appMode';
import { getMedicalHubPath, resolvePostLoginPath } from '../../utils/medicalNavigation';
import {
  getSingleActiveFacilityId,
  needsFacilityPicker,
} from '../../utils/facilitySelection';

const HomeRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeFacilityId, isBootstrapping, getMemberships, setActiveFacility } = useAuth();

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

    const runRedirect = async () => {
      let facilityId = activeFacilityId;

      if (!facilityId && memberships.length > 0) {
        if (needsFacilityPicker(memberships)) {
          navigate('/select-facility', { replace: true });
          return;
        }
        const singleId = getSingleActiveFacilityId(memberships);
        if (singleId) {
          try {
            await setActiveFacility(singleId);
            facilityId = singleId;
          } catch {
            navigate('/select-facility', { replace: true });
            return;
          }
        } else {
          navigate('/select-facility', { replace: true });
          return;
        }
      }

      if (!facilityId) {
        if (user.is_platform_admin && !isMedicalAppMode()) {
          navigate('/platform', { replace: true });
        }
        return;
      }

      if (isMedicalAppMode()) {
        navigate(getMedicalHubPath(facilityId), { replace: true });
        return;
      }

      const membershipForFacility = memberships.find(
        (m) => m.facility_id === facilityId && m.is_active
      );
      const path = resolvePostLoginPath({
        activeFacilityId: facilityId,
        membershipRole: membershipForFacility?.role ?? activeMembership?.role,
        isPlatformAdmin: user.is_platform_admin,
        hasMemberships: memberships.length > 0,
      });
      navigate(path, { replace: true });
    };

    void runRedirect();
  }, [user, activeFacilityId, isBootstrapping, getMemberships, navigate, setActiveFacility]);

  return <LoadingSpinner fullScreen />;
};

export default HomeRedirect;
