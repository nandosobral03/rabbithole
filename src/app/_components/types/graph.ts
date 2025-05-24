export interface WikipediaLink {
	title: string;
	url: string;
}

export interface WikipediaFullPageData {
	title: string;
	content: string;
	fullHtml: string;
	links: WikipediaLink[];
	url: string;
}

export interface GraphNode {
	id: string;
	title: string;
	content: string;
	fullHtml: string;
	url: string;
	outgoingLinks: WikipediaLink[];
	expanded: boolean;
	val: number;
	color: string;
}

export interface GraphLink {
	source: string;
	target: string;
	id: string;
}

export interface GraphData {
	nodes: GraphNode[];
	links: GraphLink[];
}
