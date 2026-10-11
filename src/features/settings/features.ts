import { useWorkspaceSettings } from './queries';
import type { CreatableKind } from '@/features/create/useCreateResource';

type FeatureFlag = 'sheets' | 'whiteboards' | 'databoards' | 'scrum' | 'chat';

const KIND_FLAG: Partial<Record<CreatableKind, FeatureFlag>> = {
  sheet: 'sheets',
  whiteboard: 'whiteboards',
  board: 'databoards',
  scrum: 'scrum',
};

/** Workspace module switches; everything is on unless an admin turned it off. */
export function useWorkspaceFeatures() {
  const { data } = useWorkspaceSettings();
  const isOn = (flag: FeatureFlag) => data?.features?.[flag] !== false;
  return {
    isOn,
    canCreate: (kind: CreatableKind) => {
      const flag = KIND_FLAG[kind];
      return !flag || isOn(flag);
    },
  };
}
