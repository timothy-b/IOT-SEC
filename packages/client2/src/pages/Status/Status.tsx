import { styled } from 'goober';
import { FunctionalComponent } from 'preact';

const StatusWrapper = styled('div')`
    padding: 56px 20px;
	min-height: 100%;
	width: 100%;
`;

export const Status: FunctionalComponent = () => {
    return (
        <StatusWrapper>
            <h1>Status</h1>
            <p>status things</p>
        </StatusWrapper>
    );
};
