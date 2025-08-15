export type PostImage = {
  id: number;
  imageKey: string;
  signedUrl: string | null;
};

export type PostMemo = {
  answerWhy?: string;
  answerWhat?: string;
  answerNext?: string;
};

export type PostDetail = {
  id: number;
  caption: string;
  createdAt: string;
  memo?: PostMemo;
  images: PostImage[];
};
