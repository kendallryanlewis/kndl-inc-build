import { Injectable } from '@angular/core';
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { LandingLayout, LandingLayoutUpdate } from '../models/landing-layout';

@Injectable({
    providedIn: 'root'
})
export class LandingLayoutService {
    private firestore = getFirestore();
    private collectionName = 'landingLayouts';

    constructor() { }

    // Create a new landing layout
    async createLandingLayout(layout: Omit<LandingLayout, 'id' | 'createdDate' | 'lastModified' | 'version'>): Promise<string> {
        try {
            const now = new Date().toISOString();
            const newLayout: Omit<LandingLayout, 'id'> = {
                ...layout,
                createdDate: now,
                lastModified: now,
                version: 1
            };

            const docRef = await addDoc(collection(this.firestore, this.collectionName), newLayout);
            return docRef.id;
        } catch (error) {
            console.error('Error creating landing layout:', error);
            throw error;
        }
    }

    // Get all landing layouts
    async getAllLandingLayouts(): Promise<LandingLayout[]> {
        try {
            const querySnapshot = await getDocs(collection(this.firestore, this.collectionName));
            const layouts: LandingLayout[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data() as Omit<LandingLayout, 'id'>;
                layouts.push({
                    id: doc.id,
                    ...data
                });
            });

            return layouts;
        } catch (error) {
            console.error('Error getting landing layouts:', error);
            throw error;
        }
    }

    // Get a single landing layout by ID
    async getLandingLayout(id: string): Promise<LandingLayout | null> {
        try {
            const docRef = doc(this.firestore, this.collectionName, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as Omit<LandingLayout, 'id'>;
                return {
                    id: docSnap.id,
                    ...data
                };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error getting landing layout:', error);
            throw error;
        }
    }

    // Update a landing layout
    async updateLandingLayout(id: string, updates: Partial<LandingLayoutUpdate>, author?: string): Promise<void> {
        try {
            const docRef = doc(this.firestore, this.collectionName, id);

            // Get current version and author
            const currentDoc = await getDoc(docRef);
            const currentData = currentDoc.exists() ? currentDoc.data() : {};
            const currentVersion = currentData['version'] || 1;
            const currentAuthor = currentData['author'] || 'Unknown';

            const updateData = {
                ...updates,
                lastModified: new Date().toISOString(),
                version: currentVersion + 1,
                author: author || currentAuthor
            };

            await updateDoc(docRef, updateData);
        } catch (error) {
            console.error('Error updating landing layout:', error);
            throw error;
        }
    }

    // Delete a landing layout
    async deleteLandingLayout(id: string): Promise<void> {
        try {
            const docRef = doc(this.firestore, this.collectionName, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting landing layout:', error);
            throw error;
        }
    }

    // Get the active landing layout
    async getActiveLandingLayout(): Promise<LandingLayout | null> {
        try {
            const layouts = await this.getAllLandingLayouts();
            const activeLayout = layouts.find(layout => layout.isActive);
            return activeLayout || null;
        } catch (error) {
            console.error('Error getting active landing layout:', error);
            throw error;
        }
    }

    // Set a layout as active (deactivates others)
    async setActiveLandingLayout(id: string): Promise<void> {
        try {
            // First, deactivate all layouts
            const layouts = await this.getAllLandingLayouts();
            const updatePromises = layouts.map(layout =>
                this.updateLandingLayout(layout.id, { isActive: false })
            );
            await Promise.all(updatePromises);

            // Then activate the selected layout
            await this.updateLandingLayout(id, { isActive: true });
        } catch (error) {
            console.error('Error setting active landing layout:', error);
            throw error;
        }
    }

    // Create a default landing layout from current HTML structure
    createDefaultLayout(author: string, name: string = 'Default Landing Layout'): Omit<LandingLayout, 'id' | 'createdDate' | 'lastModified' | 'version'> {
        return {
            name,
            isActive: false,
            author,

            container: {
                classes: '',
                padding: {
                    mobile: 'p-2',
                    desktop: 'p-md-5'
                }
            },

            wrapper: {
                classes: 'landing-wrapper d-flex flex-column h-100 rounded p-8'
            },

            aboutSection: {
                component: 'app-kndl-about',
                isVisible: true,
                order: 1
            },

            serviceSection: {
                component: 'app-kndl-service',
                isVisible: true,
                classes: 'h-100 w-100',
                visibility: {
                    mobile: false,
                    desktop: true
                },
                order: 2
            },

            descriptionSection: {
                isVisible: true,
                order: 3,
                content: {
                    text: 'We help local businesses and solo founders launch fast, look credible, be found, and grow smart with complete brand kits, high-converting websites, and ongoing digital marketing support.',
                    classes: 'lead my-5 pt-lg-5 col-lg-8 m-auto text-center',
                    animation: {
                        directive: 'appAnimateOnScroll',
                        animationClass: 'fade',
                        transitionDelay: '0.4s',
                        transitionDuration: '4s'
                    }
                }
            },

            ctaButton: {
                isVisible: true,
                order: 4,
                text: 'Login',
                classes: 'btn btn-dark p-2 px-4 rounded',
                routerLink: '/login',
                visibility: {
                    mobile: true,
                    desktop: false
                }
            },

            additionalSections: {
                aboutUsSection: {
                    component: 'app-kndl-about-us',
                    isVisible: false,
                    order: 5
                },
                detailedServicesSection: {
                    component: 'app-kndl-detailed-services',
                    isVisible: false,
                    order: 6
                },
                addOnsSection: {
                    component: 'app-kndl-add-ons',
                    isVisible: false,
                    order: 7
                },
                callToActionSection: {
                    component: 'app-kndl-call-to-action',
                    isVisible: false,
                    order: 8
                },
                footerSection: {
                    component: 'app-kndl-footer',
                    isVisible: false,
                    order: 9
                }
            }
        };
    }
}