interface IBlog {
  title: string;
  description: string;
  content: string;
  images: {
    url: string;
    public_id: string;
    filename: string;
    resource_type: string;
    format: string;
  }[];
}
