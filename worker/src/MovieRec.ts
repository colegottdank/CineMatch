export interface IMovieRec {
    title: string;
    imdbID: string;
    rationale1: string;
    rationale2: string;
}

export class MovieRec implements IMovieRec {
    title: string;
    imdbID: string;
    rationale1: string;
    rationale2: string;

    constructor(movieJson: IMovieRec) {
        this.title = movieJson.title;
        this.imdbID = movieJson.imdbID;
        this.rationale1 = movieJson.rationale1;
        this.rationale2 = movieJson.rationale2;
    }

    validate(): boolean {
        // Check if any of the properties are null or empty
        if (!this.title || !this.imdbID || !this.rationale1 || !this.rationale2) {
            return false;
        }
        return true;
    }
}
