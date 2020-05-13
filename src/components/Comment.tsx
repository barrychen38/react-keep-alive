import React, { forwardRef } from 'react';

interface IReactCommentProps {
  forwardRef?: React.RefObject<HTMLDivElement>;
  content: string;
  onLoaded?: () => void;
}

class ReactComment extends React.PureComponent<IReactCommentProps> {
  public static defaultProps = {
    content: '',
  };

  public componentDidMount() {
    if (this.props.onLoaded) {
      this.props.onLoaded();
    }
  }

  public render() {
    return <div ref={this.props.forwardRef} data-key={this.props.content} />;
  }
}

export default forwardRef((props: IReactCommentProps, ref: React.RefObject<HTMLDivElement>) => (
  <ReactComment {...props} forwardRef={ref} />
));
