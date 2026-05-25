import { Injectable } from '@angular/core';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface ContactEmailPayload {
    name: string;
    email: string;
    phone: string;
    message: string;
    website: string;
    formStartedAt: number;
}

@Injectable({ providedIn: 'root' })
export class ContactEmailService {
    private functions = getFunctions();

    async sendContactEmail(payload: ContactEmailPayload): Promise<void> {
        const sendEmail = httpsCallable<ContactEmailPayload, { ok: boolean }>(
            this.functions,
            'sendContactEmail'
        );

        await sendEmail(payload);
    }
}
