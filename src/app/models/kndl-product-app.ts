export interface KndlProductReview {
    rating: number | null;
    title: string;
    body: string;
    nickname: string;
    createdDate: string;
    territory: string;
}

export interface KndlProductSubscription {
    productId: string;
    name: string;
    state: string;
    period: string;
    familySharable: boolean;
}

export interface KndlProductSubscriptionGroup {
    id: string;
    name: string;
    subscriptions: KndlProductSubscription[];
}

export interface KndlProductIAP {
    productId: string;
    name: string;
    type: string;
    state: string;
    familySharable: boolean;
}

export interface KndlProductApp {
    id: string;
    name: string;
    summary: string;
    description?: string;
    type?: string;
    status?: 'Live' | 'In Progress' | 'Planned';
    provider?: string;
    appleAppId?: string;
    bundleId?: string;
    sku?: string;
    stack?: string;
    portfolioIntro?: string;
    services?: string[];
    galleryLabels?: string[];
    screenImageUrl?: string;
    screenshotUrls?: string[];
    artworkUrl100?: string;
    artworkUrl512?: string;
    locale?: string;
    appVersionState?: string;
    versionString?: string;
    whatsNew?: string;
    privacyPolicyUrl?: string;
    supportUrl?: string;
    termsUrl?: string;
    appStoreUrl?: string;
    releaseDate?: string;
    averageUserRating?: number;
    userRatingCount?: number;
    genres?: string[];
    fileSizeBytes?: string;
    minimumOsVersion?: string;
    contentAdvisoryRating?: string;
    // Pricing
    price?: number | null;
    formattedPrice?: string;
    currency?: string;
    hasPriceSchedule?: boolean;
    // Categories & content
    primaryGenreName?: string;
    contentRightsDeclaration?: string;
    // Ratings context
    advisories?: string[];
    languageCodes?: string[];
    // Availability
    availableTerritoryCount?: number | null;
    // Reviews
    customerReviews?: KndlProductReview[];
    // EULA
    eulaText?: string;
    // In-app purchases & subscriptions
    inAppPurchases?: KndlProductIAP[];
    subscriptionGroups?: KndlProductSubscriptionGroup[];
}
