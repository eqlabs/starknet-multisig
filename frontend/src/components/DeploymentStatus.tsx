import * as Progress from '@radix-ui/react-progress';
import { useCallback } from 'react';
import { TransactionStatus } from '~/types';
import { styled } from "../../stitches.config";
import { Legend } from './Forms';

type Props = {
  status: TransactionStatus
}

const StyledProgress = styled(Progress.Root, {
  position: 'relative',
  overflow: 'hidden',
  background: "$textMuted",
  width: "100%",
  height: '$1',
  marginTop: "$4",
  marginBottom: "$2",
});

const StyledIndicator = styled(Progress.Indicator, {
  background: '$accent',
  height: "100%",
  width: "100%",
  transition: 'transform 500ms ease',
});

const Small = styled("small", {
  color: "$textMuted"
});

const DeploymentStatus = ({status}: Props) => {
  const shownStatuses = [TransactionStatus.NOT_RECEIVED, TransactionStatus.RECEIVED, TransactionStatus.PENDING, TransactionStatus.ACCEPTED_ON_L2]
  const progress = Math.floor((shownStatuses.findIndex((value) => value === status)) / shownStatuses.length * 100)

  const getStatusLegend = useCallback(() => {
    let statusLegend: string = "The transaction has not been received yet by Starknet.";
    switch (status) {
      case TransactionStatus.RECEIVED: {
        statusLegend = "The transaction has been received, and is waiting to be added to a block.";
        break;
      }
      case TransactionStatus.PENDING: {
        statusLegend = "The transaction has been validated and added to the pending block.";
        break;
      }
      case TransactionStatus.ACCEPTED_ON_L2: {
        statusLegend = "The transaction is in a created block.";
        break;
      }
      default: {
        statusLegend = "The transaction has not been received yet by Starknet.";
      }
    }
    return statusLegend
  }, [status])

  return <>
    <StyledProgress value={progress} max={100}>
      <StyledIndicator style={{ transform: `translateX(-${100 - progress}%)` }} />
    </StyledProgress>
    
    <Legend as="h3">{status}</Legend>
    <Small>{getStatusLegend()}</Small>
  </>
}

export default DeploymentStatus;
