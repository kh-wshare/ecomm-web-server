import { BaseQueryDto } from '#app/common/dto/base-query.dto';

/**
 * No owner filter: the owner is always the authenticated staff member, taken
 * from the token rather than the request, so one staff member cannot read
 * another's carts by passing their id.
 */
export class PosCartQueryDto extends BaseQueryDto {}
