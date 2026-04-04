import type { ChatMode } from '../types';

type PacketFlowDiagramProps = {
  mode: ChatMode;
  isLoading: boolean;
};

type NodeProps = {
  x: number;
  label: string;
  active: boolean;
};

function DiagramNode({ x, label, active }: NodeProps) {
  return (
    <g>
      <rect
        x={x}
        y={46}
        width={180}
        height={72}
        rx={20}
        className={active ? 'flow-node flow-node-active' : 'flow-node'}
      />
      <text x={x + 90} y={88} textAnchor="middle" className="flow-node-label">
        {label}
      </text>
    </g>
  );
}

type ArrowProps = {
  x1: number;
  x2: number;
  active: boolean;
  animate: boolean;
};

function DiagramArrow({ x1, x2, active, animate }: ArrowProps) {
  const className = active
    ? `flow-arrow${animate ? ' flow-arrow-animated' : ''}`
    : 'flow-arrow flow-arrow-muted';

  return <line x1={x1} y1={82} x2={x2} y2={82} markerEnd="url(#arrow-head)" className={className} />;
}

export function PacketFlowDiagram({ mode, isLoading }: PacketFlowDiagramProps) {
  const isDirect = mode === 'direct';

  return (
    <section className="panel flow-panel">
      <div className="flow-header">
        <p className="section-kicker">Packet flow</p>
        <span className={isLoading ? 'status-badge status-live' : 'status-badge'}>
          {isLoading ? 'Request in progress' : isDirect ? 'Direct route active' : 'Proxy route active'}
        </span>
      </div>

      <svg viewBox="0 0 700 164" className="flow-diagram" role="img" aria-label="Request flow diagram">
        <defs>
          <marker id="arrow-head" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
            <path d="M 0 0 L 12 6 L 0 12 z" className="flow-arrow-head" />
          </marker>
        </defs>

        <DiagramNode x={24} label="Chat App" active />
        <DiagramNode x={260} label="AI Gateway Proxy" active={!isDirect} />
        <DiagramNode x={496} label="Google Gemini" active />

        <DiagramArrow x1={204} x2={260} active={!isDirect} animate={isLoading && !isDirect} />
        <DiagramArrow x1={204} x2={496} active={isDirect} animate={isLoading && isDirect} />
        <DiagramArrow x1={440} x2={496} active={!isDirect} animate={isLoading && !isDirect} />
      </svg>

      <p className="flow-caption">
        {isDirect
          ? 'Chat App -> Google Gemini using Gemini generateContent payloads.'
          : 'Chat App -> AI Gateway Proxy -> Google Gemini using an OpenAI-compatible chat payload.'}
      </p>
    </section>
  );
}
