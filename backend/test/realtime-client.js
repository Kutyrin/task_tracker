const { io } = require('socket.io-client');

const token = process.env.TEST_TOKEN;

if (!token) {
  console.error('TEST_TOKEN is required');
  process.exit(1);
}

const socket = io('http://localhost:3001', {
  auth: {
    token,
  },
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);

  socket.emit('join-project', 1);

  socket.emit('join-task', 7);
});

socket.on('joined-project', (data) => {
  console.log('joined-project:', data);
});

socket.on('joined-task', (data) => {
  console.log('joined-task:', data);
});

socket.on('task.created', (task) => {
  console.log('task.created:', task);
});

socket.on('task.updated', (task) => {
  console.log('task.updated:', task);
});

socket.on('task.moved', (task) => {
  console.log('task.moved:', task);
});

socket.on('task.deleted', (data) => {
  console.log('task.deleted:', data);
});

socket.on('comment.created', (comment) => {
  console.log('comment.created:', comment);
});

socket.on('comment.updated', (comment) => {
  console.log('comment.updated:', comment);
});

socket.on('comment.deleted', (data) => {
  console.log('comment.deleted:', data);
});

socket.on('label.added', (label) => {
  console.log('label.added:', label);
});

socket.on('label.removed', (label) => {
  console.log('label.removed:', label);
});

socket.on('label.created', (label) => {
  console.log('label.created:', label);
});

socket.on('label.updated', (label) => {
  console.log('label.updated:', label);
});

socket.on('label.deleted', (data) => {
  console.log('label.deleted:', data);
});

socket.on('member.added', (member) => {
  console.log('member.added:', member);
});

socket.on('member.role.updated', (member) => {
  console.log('member.role.updated:', member);
});

socket.on('member.removed', (data) => {
  console.log('member.removed:', data);
});

socket.on('project.access.revoked', (data) => {
  console.log('project.access.revoked:', data);
});

socket.on('board.created', (board) => {
  console.log('board.created:', board);
});

socket.on('board.updated', (board) => {
  console.log('board.updated:', board);
});

socket.on('board.deleted', (data) => {
  console.log('board.deleted:', data);
});

socket.on('column.created', (column) => {
  console.log('column.created:', column);
});

socket.on('column.updated', (column) => {
  console.log('column.updated:', column);
});

socket.on('column.moved', (column) => {
  console.log('column.moved:', column);
});

socket.on('column.deleted', (data) => {
  console.log('column.deleted:', data);
});

socket.on('attachment.uploaded', (attachment) => {
  console.log('attachment.uploaded:', attachment);
});

socket.on('attachment.deleted', (data) => {
  console.log('attachment.deleted:', data);
});

socket.on('project.created', (project) => {
  console.log('project.created:', project);
});

socket.on('project.updated', (project) => {
  console.log('project.updated:', project);
});

socket.on('project.deleted', (data) => {
  console.log('project.deleted:', data);
});

socket.on('activity.created', (activity) => {
  console.log('activity.created:', activity);
});

socket.on('exception', (error) => {
  console.error('Socket exception:', error);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
