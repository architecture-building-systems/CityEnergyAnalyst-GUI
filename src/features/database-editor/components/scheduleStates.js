// Shared states for the heating/cooling schedule editors.
// Backend enum (see cea/schemas.yml): 'OFF' | 'SETBACK' | 'SETPOINT'

export const SCHEDULE_STATES = ['OFF', 'SETBACK', 'SETPOINT'];

export const STATE_COLORS = {
  OFF: '#f0f0f0',
  SETBACK: '#8eb6dc',
  SETPOINT: '#1470AF',
};
