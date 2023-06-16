export interface IMovieRec {
    title: string;
    imdbID: string;
    rationales: string[];
}

export class MovieRec implements IMovieRec {
    title: string;
    imdbID: string;
    rationales: string[];

    constructor(movieJson: IMovieRec) {
        this.title = movieJson.title;
        this.imdbID = movieJson.imdbID;
        this.rationales = movieJson.rationales;
    }

    validate(): boolean {
        // Check if any of the properties are null or empty
        if (!this.title || !this.imdbID || this.rationales.length !== 0) {
            return false;
        }
        return true;
    }
}
