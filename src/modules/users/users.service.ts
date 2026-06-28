import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  status: true,
  platformRole: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async adminCreate(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.findByEmail(email)) {
      throw new ConflictException('Email already in use');
    }
    return this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName.trim(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        platformRole: dto.platformRole,
      },
      select: safeUserSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      });
      return tx.user.update({
        where: { id },
        data: { deletedAt: now, status: 'INACTIVE' },
        select: safeUserSelect,
      });
    });
  }
}
