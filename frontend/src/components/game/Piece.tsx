import React from 'react';
import clsx from 'clsx';

interface PieceProps {
    color: 'WHITE' | 'BLACK';
    isKing?: boolean;
    isSelected?: boolean;
    isMoving?: boolean;
}

export const Piece: React.FC<PieceProps> = ({ color, isKing, isSelected, isMoving }) => {
    const isWhite = color === 'WHITE';

    return (
        <div
            className={clsx(
                'w-[82%] h-[82%] rounded-full relative transition-transform duration-150',
                '[transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]',
                isSelected && 'scale-[1.12]',
                isMoving && 'scale-[1.08]',
            )}
            style={{
                /* Layered box-shadows create a realistic 3-D disc look */
                boxShadow: isWhite
                    ? [
                        '0 1px 0 1px rgba(0,0,0,0.25)',          // pressed edge
                        '0 3px 6px rgba(0,0,0,0.4)',              // drop shadow
                        '0 6px 10px rgba(0,0,0,0.25)',            // ambient shadow
                        'inset 0 -3px 5px rgba(0,0,0,0.18)',      // bottom rim shading
                        'inset 0 3px 6px rgba(255,255,255,0.8)',  // top specular
                    ].join(',')
                    : [
                        '0 1px 0 1px rgba(0,0,0,0.5)',
                        '0 3px 6px rgba(0,0,0,0.6)',
                        '0 6px 10px rgba(0,0,0,0.4)',
                        'inset 0 -3px 5px rgba(0,0,0,0.35)',
                        'inset 0 3px 6px rgba(255,255,255,0.08)',
                    ].join(','),
                background: isWhite
                    ? 'radial-gradient(ellipse at 38% 32%, #ffffff 0%, #e2dfdb 55%, #c8c3bc 100%)'
                    : 'radial-gradient(ellipse at 38% 32%, #4b4742 0%, #2a2623 55%, #141210 100%)',
                ...(isSelected && {
                    filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.7))',
                }),
            }}
        >
            {/* Rim highlight ring */}
            <div
                className="absolute rounded-full"
                style={{
                    inset: '7%',
                    border: isWhite
                        ? '1.5px solid rgba(255,255,255,0.55)'
                        : '1.5px solid rgba(255,255,255,0.10)',
                    boxShadow: isWhite
                        ? 'inset 0 1px 3px rgba(255,255,255,0.6)'
                        : 'inset 0 1px 3px rgba(255,255,255,0.04)',
                }}
            />

            {/* Top specular dot */}
            <div
                className="absolute rounded-full pointer-events-none"
                style={{
                    width: '30%',
                    height: '18%',
                    top: '16%',
                    left: '22%',
                    background: isWhite
                        ? 'radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, transparent 100%)'
                        : 'radial-gradient(ellipse, rgba(255,255,255,0.18) 0%, transparent 100%)',
                }}
            />

            {/* King crown */}
            {isKing && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                        viewBox="0 0 24 24"
                        className={clsx(
                            'relative z-10 drop-shadow-md',
                            isWhite ? 'w-[46%] h-[46%]' : 'w-[46%] h-[46%]',
                        )}
                        aria-hidden="true"
                    >
                        {/* Crown filled shape */}
                        <path
                            d="M3 18h18l-1.5-9-4.5 4.5L12 6l-3 7.5L4.5 9 3 18z"
                            fill={isWhite ? 'rgba(30,20,5,0.85)' : 'rgba(255,220,100,0.9)'}
                            stroke={isWhite ? 'rgba(0,0,0,0.2)' : 'rgba(200,160,0,0.6)'}
                            strokeWidth="0.5"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
};
