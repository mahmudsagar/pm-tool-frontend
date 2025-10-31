import { createElement, Fragment, memo } from 'react';

import { useOverflowDetector } from 'react-detectable-overflow';
import { Tooltip } from '../elements/tooltip';


const ellipsisStyle = {
  width: 'auto',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
};



const EllipsisTooltip = memo(({ children, title, HtmlTag = 'span', className = '', style = {}, tooltip = true, ...props }) => {
  const { ref, overflow } = useOverflowDetector({});
  const Wrapper = tooltip && overflow ? Tooltip : Fragment;

  return (
    <Wrapper
      {...(overflow && tooltip) && { title: title }}
    >
      {createElement(
        HtmlTag,
        { ref: ref, style: { ...(tooltip && ellipsisStyle), ...style }, className, ...props },
        children
      )}
    </Wrapper>
  );
});

EllipsisTooltip.displayName = 'EllipsisTooltip';

export default EllipsisTooltip;