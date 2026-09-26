import { reportRepository } from './report.repository.js';
import { postRepository } from '../posts/post.repository.js';
import { commentRepository } from '../comments/comment.repository.js';
import { userRepository } from '../users/user.repository.js';
import { NotFoundError, ConflictError } from '../../errors/AppError.js';

export class ReportService {
  async create(reporterId, data) {
    // Validate target exists
    switch (data.targetType) {
      case 'post': {
        const post = await postRepository.findById(data.targetId);
        if (!post) throw new NotFoundError('Post');
        break;
      }
      case 'comment': {
        const comment = await commentRepository.findById(data.targetId);
        if (!comment) throw new NotFoundError('Comment');
        break;
      }
      case 'user': {
        const user = await userRepository.findById(data.targetId);
        if (!user) throw new NotFoundError('User');
        break;
      }
      default:
        throw new Error('Invalid target type');
    }

    const reportData = {
      reporterId,
      targetType: data.targetType,
      reason: data.reason,
      description: data.description,
    };

    if (data.targetType === 'post') reportData.postId = data.targetId;
    if (data.targetType === 'comment') reportData.commentId = data.targetId;
    if (data.targetType === 'user') reportData.reportedUserId = data.targetId;

    return reportRepository.create(reportData);
  }

  async getReport(id) {
    return reportRepository.findById(id);
  }

  async list(params) {
    return reportRepository.list(params);
  }

  async updateStatus(id, status, reviewedBy) {
    const report = await reportRepository.findById(id);
    if (!report) {
      throw new NotFoundError('Report');
    }

    return reportRepository.updateStatus(id, status, reviewedBy);
  }

  async getByReporter(reporterId, params) {
    return reportRepository.getByReporter(reporterId, params);
  }
}

export const reportService = new ReportService();