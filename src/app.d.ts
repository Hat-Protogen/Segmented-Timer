// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

declare global {
	interface Window {
		electron: {
			send: (channel: string, data: any) => void;
			receive: (channel: string, callback: (...args: any[]) => void) => void;
		};
	}
}

