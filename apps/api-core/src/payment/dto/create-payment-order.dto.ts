import { IsIn, IsString } from "class-validator";

export class CreatePaymentOrderDto {
  @IsIn(["ALIPAY", "WECHAT_PAY"])
  provider!: "ALIPAY" | "WECHAT_PAY";

  @IsString()
  packageCode!: string;
}
