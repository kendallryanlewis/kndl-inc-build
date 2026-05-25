import { Component, EventEmitter, Output } from '@angular/core';
import { ContactEmailService } from '../../services/contact-email.service';

@Component({
    selector: 'app-kndl-contact',
    templateUrl: './kndl-contact.component.html',
    styleUrls: ['./kndl-contact.component.scss']
})
export class KndlContactComponent {
    @Output() tabChange = new EventEmitter<string>();

    contactFormSubmitted = false;
    contactFormError = '';
    isSubmittingContactForm = false;
    botWebsite = '';
    formStartedAt = Date.now();
    contactForm = {
        name: '',
        email: '',
        phone: '',
        message: ''
    };

    constructor(private contactEmailService: ContactEmailService) { }

    async submitContactForm(): Promise<void> {
        if (this.isSubmittingContactForm) {
            return;
        }

        this.contactFormSubmitted = false;
        this.contactFormError = '';
        this.isSubmittingContactForm = true;

        try {
            await this.contactEmailService.sendContactEmail({
                ...this.contactForm,
                website: this.botWebsite,
                formStartedAt: this.formStartedAt
            });

            this.contactFormSubmitted = true;
            this.contactForm = {
                name: '',
                email: '',
                phone: '',
                message: ''
            };
            this.botWebsite = '';
            this.formStartedAt = Date.now();
        } catch (error) {
            console.error('Contact form submission failed:', error);
            this.contactFormError = 'Unable to send your message right now. Please email kndl-inc@gmail.com directly.';
        } finally {
            this.isSubmittingContactForm = false;
        }
    }
}
