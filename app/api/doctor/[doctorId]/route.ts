import {NextRequest, NextResponse} from 'next/server';

const DOCTOR: {doctorId: string; name: string; } = {
  doctorId: 'DOC-01',
  name: 'Dr. Smith',
};

const SLOTS: {slotId: string; time: string; available: boolean;}[] = [
  {slotId: '1', time: '9:00 AM', available: true},
  {slotId: '2', time: '10:00 AM', available: false},
  {slotId: '3', time: '11:00 AM', available: true},
];