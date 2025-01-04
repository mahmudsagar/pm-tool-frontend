/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useEffect, useState } from "react";

function createUID() {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(0, 5);
}

export function createComment(
  content,
  author,
  id,
  timeStamp,
  deleted
) {
  return {
    author,
    content,
    deleted: deleted === undefined ? false : deleted,
    id: id === undefined ? createUID() : id,
    timeStamp:
      timeStamp === undefined
        ? performance.timeOrigin + performance.now()
        : timeStamp,
    type: "comment",
  };
}

export function createThread(
  quote,
  comments,
  id
) {
  return {
    comments,
    id: id === undefined ? createUID() : id,
    quote,
    type: "thread",
  };
}

function cloneThread(thread) {
  return {
    comments: Array.from(thread.comments),
    id: thread.id,
    quote: thread.quote,
    type: "thread",
  };
}

function markDeleted(comment) {
  return {
    author: comment.author,
    content: "[Deleted Comment]",
    deleted: true,
    id: comment.id,
    timeStamp: comment.timeStamp,
    type: "comment",
  };
}

function triggerOnChange(commentStore) {
  const listeners = commentStore._changeListeners;
  for (const listener of listeners) {
    listener();
  }
}

export class CommentStore {
  _editor;
  _comments;
  _changeListeners;

  constructor(editor) {
    this._comments = [];
    this._editor = editor;
    this._changeListeners = new Set();
  }


  getComments() {
    return this._comments;
  }

  loadFromLocalStorage(){
    if(localStorage.getItem('comments')){
      this._comments = JSON.parse(localStorage.getItem('comments'));
      triggerOnChange(this);
    }
  }

  addComment(
    commentOrThread,
    thread,
    offset
  ) {
    const nextComments = Array.from(this._comments);

    if (thread !== undefined && commentOrThread.type === "comment") {
      for (let i = 0; i < nextComments.length; i++) {
        const comment = nextComments[i];
        if (comment.type === "thread" && comment.id === thread.id) {
          const newThread = cloneThread(comment);
          nextComments.splice(i, 1, newThread);
          const insertOffset =
            offset !== undefined ? offset : newThread.comments.length;
          newThread.comments.splice(insertOffset, 0, commentOrThread);
          break;
        }
      }
    } else {
      const insertOffset = offset !== undefined ? offset : nextComments.length;
      nextComments.splice(insertOffset, 0, commentOrThread);
    }
    this._comments = nextComments;
    localStorage.setItem('comments', JSON.stringify(nextComments))
    triggerOnChange(this);
  }

  deleteCommentOrThread(
    commentOrThread,
    thread
  ) {
    const nextComments = Array.from(this._comments);
    // The YJS types explicitly use `any` as well.
    const sharedCommentsArray = this._getCollabComments();
    let commentIndex = null;

    if (thread !== undefined) {
      for (let i = 0; i < nextComments.length; i++) {
        const nextComment = nextComments[i];
        if (nextComment.type === "thread" && nextComment.id === thread.id) {
          const newThread = cloneThread(nextComment);
          nextComments.splice(i, 1, newThread);
          const threadComments = newThread.comments;
          commentIndex = threadComments.indexOf(commentOrThread);
          if (this.isCollaborative() && sharedCommentsArray !== null) {
            const parentSharedArray = sharedCommentsArray
              .get(i)
              .get("comments");
            this._withRemoteTransaction(() => {
              parentSharedArray.delete(commentIndex);
            });
          }
          threadComments.splice(commentIndex, 1);
          break;
        }
      }
    } else {
      commentIndex = nextComments.indexOf(commentOrThread);
      nextComments.splice(commentIndex, 1);
    }
    this._comments = nextComments;
    triggerOnChange(this);

    if (commentOrThread.type === "comment") {
      return {
        index: commentIndex,
        markedComment: markDeleted(commentOrThread),
      };
    }

    return null;
  }

  registerOnChange(onChange) {
    const changeListeners = this._changeListeners;
    changeListeners.add(onChange);
    return () => {
      changeListeners.delete(onChange);
    };
  }

}

export function useCommentStore(commentStore) {
  const [comments, setComments] = useState(
    commentStore.getComments()
  );

  useEffect(() => {
    return commentStore.registerOnChange(() => {
      setComments(commentStore.getComments());
    });
  }, [commentStore]);

  return comments;
}
