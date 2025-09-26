export interface AboutUsContent {
    id?: string;

    // Main heading
    mainHeading: string;
    subHeading: string;

    // Process section
    processTitle: string;
    processSteps: {
        number: string;
        title: string;
        description: string;
        delay?: string;
    }[];

    // Brand section
    brandTitle: string;
    brandDescription: string[];
    brandFeatures: {
        title: string;
        description: string;
    }[];

    // Styling options
    styling: {
        hrWidth: string;
        processColors: {
            text: string;
            background: string;
        };
    };

    // Metadata
    createdDate?: string;
    lastModified?: string;
    author?: string;
    version?: number;
    isActive: boolean;
}