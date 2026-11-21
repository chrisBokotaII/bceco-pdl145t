import { registerSW } from 'virtual:pwa-register';

export type ServiceWorkerStatus =
  | 'IDLE'
  | 'REGISTERING'
  | 'ACTIVE'
  | 'OFFLINE_READY'
  | 'UPDATE_AVAILABLE'
  | 'UNSUPPORTED'
  | 'ERROR';

export interface ServiceWorkerState {
  status: ServiceWorkerStatus;
  offlineReady: boolean;
  needRefresh: boolean;
  scope: string | null;
  lastCheckedAt: string | null;
  errorMessage: string | null;
}

type Listener = (state: ServiceWorkerState) => void;

let state: ServiceWorkerState = {
  status: 'IDLE',
  offlineReady: false,
  needRefresh: false,
  scope: null,
  lastCheckedAt: null,
  errorMessage: null,
};

let initialized = false;
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
const listeners = new Set<Listener>();

function emit(patch: Partial<ServiceWorkerState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) {
    listener(state);
  }
}

export function getServiceWorkerState(): ServiceWorkerState {
  return state;
}

export function subscribeServiceWorkerState(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function initServiceWorker(): void {
  if (initialized) return;
  initialized = true;

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    emit({
      status: 'UNSUPPORTED',
      offlineReady: false,
      errorMessage: 'Service Worker non pris en charge par ce navigateur.',
    });
    return;
  }

  emit({ status: 'REGISTERING', errorMessage: null });

  try {
    updateSWFn = registerSW({
      immediate: true,
      onOfflineReady() {
        emit({
          status: 'OFFLINE_READY',
          offlineReady: true,
          lastCheckedAt: new Date().toISOString(),
        });
      },
      onNeedRefresh() {
        emit({
          status: 'UPDATE_AVAILABLE',
          needRefresh: true,
          lastCheckedAt: new Date().toISOString(),
        });
      },
      onRegisteredSW(_swUrl, registration) {
        swRegistration = registration ?? null;
        const hasActive = Boolean(registration?.active || navigator.serviceWorker.controller);
        emit({
          status: state.offlineReady ? 'OFFLINE_READY' : hasActive ? 'ACTIVE' : 'REGISTERING',
          offlineReady: state.offlineReady || hasActive,
          scope: registration?.scope ?? '/',
          lastCheckedAt: new Date().toISOString(),
          errorMessage: null,
        });
      },
      onRegisterError(err) {
        emit({
          status: 'ERROR',
          errorMessage: err instanceof Error ? err.message : 'Erreur d’enregistrement du Service Worker.',
        });
      },
    });
  } catch (err) {
    emit({
      status: 'ERROR',
      errorMessage: err instanceof Error ? err.message : 'Service Worker indisponible.',
    });
  }
}

export async function applyServiceWorkerUpdate(): Promise<void> {
  if (updateSWFn) {
    await updateSWFn(true);
  }
}

export async function checkForServiceWorkerUpdate(): Promise<void> {
  if (swRegistration) {
    await swRegistration.update().catch(() => undefined);
    emit({ lastCheckedAt: new Date().toISOString() });
  }
}
