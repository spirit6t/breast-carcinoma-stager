import type { CaseData } from '../lib/types';
import { CAPFormDCIS } from './CAPFormDCIS';
import { CAPFormInvasive } from './CAPFormInvasive';

interface Props {
  caseState: CaseData;
  update: (fn: (c: CaseData) => CaseData) => void;
}

export function CAPFormStep({ caseState, update }: Props) {
  if (caseState.mode === 'excision-invasive') {
    return <CAPFormInvasive caseState={caseState} update={update} />;
  }
  return <CAPFormDCIS caseState={caseState} update={update} />;
}
