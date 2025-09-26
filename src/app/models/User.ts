export interface User {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    platforms: UserPlatform[];
    onboardingCompleted?: boolean;
    role: 'Admin' | 'User' | 'Manager';
    status: 'Active' | 'Deleted' | 'Invited';
    joinDate?: Date;
    lastLogin?: Date;
    location?: string; // Added location property
    bio?: string;
}

export interface UserPlatform {
    id: string;
    name: string;
    url: string;
    defaultUserEmail: string;
    company?: string;
    dateCreated: Date;
    dateUpdated: Date;
    description?: string;
    platformType?: string;
    status?: string;
    // Add more fields as needed for site/platform details
}
