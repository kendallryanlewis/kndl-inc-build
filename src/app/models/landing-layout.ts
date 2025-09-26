export interface LandingLayout {
    id: string;
    name: string;
    isActive: boolean;
    createdDate: string;
    lastModified: string;
    author: string;
    version: number;

    // Layout structure
    container: {
        classes: string;
        padding: {
            mobile: string;
            desktop: string;
        };
    };

    wrapper: {
        classes: string;
        backgroundImage?: string;
        backgroundColor?: string;
    };

    // Content sections
    aboutSection: {
        component: string;
        isVisible: boolean;
        order: number;
    };

    serviceSection: {
        component: string;
        isVisible: boolean;
        classes: string;
        visibility: {
            mobile: boolean;
            desktop: boolean;
        };
        order: number;
    };

    descriptionSection: {
        isVisible: boolean;
        order: number;
        content: {
            text: string;
            classes: string;
            animation: {
                directive: string;
                animationClass: string;
                transitionDelay: string;
                transitionDuration: string;
            };
        };
    };

    ctaButton: {
        isVisible: boolean;
        order: number;
        text: string;
        classes: string;
        routerLink: string;
        visibility: {
            mobile: boolean;
            desktop: boolean;
        };
    };

    // Additional sections that can be toggled
    additionalSections?: {
        aboutUsSection?: {
            component: string;
            isVisible: boolean;
            order: number;
        };
        detailedServicesSection?: {
            component: string;
            isVisible: boolean;
            order: number;
        };
        addOnsSection?: {
            component: string;
            isVisible: boolean;
            order: number;
        };
        callToActionSection?: {
            component: string;
            isVisible: boolean;
            order: number;
        };
        footerSection?: {
            component: string;
            isVisible: boolean;
            order: number;
        };
    };
}

export interface LandingLayoutUpdate {
    id?: string;
    name?: string;
    lastModified: string;
    author: string;
    version: number;
    [key: string]: any; // For partial updates
}