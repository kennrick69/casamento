'use client';

import type { Venue3DObjectKind } from '@prisma/client';
import { TableRound } from './objects/TableRound';
import { TableRect } from './objects/TableRect';
import { TableSpecial } from './objects/TableSpecial';
import { DanceFloor } from './objects/DanceFloor';
import { Stage } from './objects/Stage';
import { DjBooth } from './objects/DjBooth';
import { Bar } from './objects/Bar';
import { Buffet } from './objects/Buffet';
import { CakeTable } from './objects/CakeTable';
import { Plant } from './objects/Plant';
import { Chandelier } from './objects/Chandelier';
import { Rug } from './objects/Rug';
import { FlowerArch } from './objects/FlowerArch';

interface Props {
  kind: Venue3DObjectKind;
  posX: number;
  posZ: number;
  rotation: number;
  seats?: number | null;
  label?: string | null;
}

export function Venue3DObjectRenderer({ kind, posX, posZ, rotation, seats }: Props) {
  const base = { posX, posZ, rotation };

  switch (kind) {
    case 'TABLE_ROUND_6':  return <TableRound {...base} seats={6} />;
    case 'TABLE_ROUND_8':  return <TableRound {...base} seats={8} />;
    case 'TABLE_ROUND_10': return <TableRound {...base} seats={10} />;
    case 'TABLE_ROUND_12': return <TableRound {...base} seats={12} />;
    case 'TABLE_RECT_4':   return <TableRect  {...base} variant="rect4" />;
    case 'TABLE_RECT_6':   return <TableRect  {...base} variant="rect6" />;
    case 'TABLE_IMPERIAL_16': return <TableRect {...base} variant="imperial16" />;
    case 'TABLE_U': return <TableSpecial {...base} shape="U" />;
    case 'TABLE_C': return <TableSpecial {...base} shape="C" />;
    case 'TABLE_T': return <TableSpecial {...base} shape="T" />;
    case 'DANCE_FLOOR': return <DanceFloor {...base} />;
    case 'STAGE':       return <Stage     {...base} />;
    case 'DJ_BOOTH':    return <DjBooth   {...base} />;
    case 'BAR':         return <Bar       {...base} />;
    case 'BUFFET':      return <Buffet    {...base} />;
    case 'CAKE_TABLE':  return <CakeTable {...base} />;
    case 'PLANT':       return <Plant     {...base} />;
    case 'CHANDELIER':  return <Chandelier {...base} />;
    case 'RUG':         return <Rug       {...base} />;
    case 'FLOWER_ARCH': return <FlowerArch {...base} />;
    default:            return null;
  }
}
